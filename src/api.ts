import express from 'express';
import cors from 'cors';
import { Post, Postgres } from './database';
import { MoreThan } from 'typeorm';
import { client } from '.';

const app = express();
app.use(cors());

app.get(`/votes`, async (req, res) => {

    const projects = await Postgres.getRepository(Post).find({
        relations: ['votes']
    });

    const top = [];
    for (const project of projects) {
        top.push({
            ...project,
            projectValue: project.votes.map((vote) => vote.voteValue).reduce((a, b) => a + b, 0)
        });
    }
    top.sort((a, b) => b.projectValue - a.projectValue);

    res.json(top);

});

app.get('/stats', async (req, res) => {

    
    res.json({
        serverCount: client.guilds.cache.size,
        userCount: 1300
    });

});

app.listen(process.env.API_PORT);
