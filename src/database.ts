import { Entity, Column, DataSource, PrimaryGeneratedColumn, BaseEntity, CreateDateColumn, ManyToMany, ManyToOne, OneToMany, RelationId } from "typeorm";
import express from 'express';
import { Database, Resource } from '@adminjs/typeorm';
import { validate } from 'class-validator';

import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Base } from "discord.js";

Resource.validate = validate;
AdminJS.registerAdapter({ Database, Resource });

@Entity()
export class GuildConfiguration extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        length: 32,
        unique: true
    })
    guildId!: string;

    @Column({
        length: 32,
        nullable: true
    })
    channelId!: string;
    
    @Column({
        length: 32,
        nullable: true
    })
    roleId!: string;

    @Column({
        default: false
    })
    isVerifiedDAO!: boolean;

    @CreateDateColumn()
    createdAt!: Date;


}

@Entity()
export class Post extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    projectName!: string;

    @Column()
    projectDescription!: string;

    @Column()
    projectTwitterUrl!: string;

    @Column()
    projectImageUrl!: string;

    @OneToMany(() => UserVote, vote => vote.post)
    votes!: UserVote[];

    @CreateDateColumn()
    createdAt!: Date;

}

@Entity()
export class PostMessage extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    messageId!: string;

    @Column()
    channelId!: string;

    @Column()
    guildId!: string;

    @Column()
    post!: Post;

    @RelationId((message: PostMessage) => message.post)
    postId!: number;

    @CreateDateColumn()
    createdAt!: Date;
}

@Entity()
export class UserVote extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        length: 32
    })
    userId!: string;

    @Column({
        length: 32
    })
    guildId!: string;

    @ManyToOne(() => Post, post => post.votes)
    post!: Post;

    @Column()
    voteValue!: number;

    @CreateDateColumn()
    createdAt!: Date;
}

export const Postgres = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    entities: [GuildConfiguration, Post, UserVote, PostMessage],
    synchronize: process.env.ENVIRONMENT === 'development',
});

export const initialize = () => Postgres.initialize().then(() => {
    if (process.env.ADMINJS_PORT) {
        const app = express();
        const admin = new AdminJS({
            branding: {
                
            },
            resources: [GuildConfiguration, Post, UserVote, PostMessage],
        })
        const router = AdminJSExpress.buildRouter(admin)
        app.use(admin.options.rootPath, router)
        app.listen(process.env.ADMINJS_PORT, () => {
            console.log(`AdminJS is listening at http://localhost:${process.env.ADMINJS_PORT}`)
        });
    }
    
});
