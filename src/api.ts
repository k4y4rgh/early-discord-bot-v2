import express from 'express';
import cors from 'cors';
import { Post, Postgres } from './database';
import { MoreThan } from 'typeorm';

const app = express();
app.use(cors());

app.get(`/votes`, async (req, res) => {

    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const projects = await Postgres.getRepository(Post).find({
        relations: ['votes'],
        where: {
            createdAt: MoreThan(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
        }
    });

    const top = [];
    for (const project of projects) {
        top.push({
            ...project,
            projectValue: project.votes.map((vote) => vote.voteValue).reduce((a, b) => a + b, 0)
        });
    }
    top.sort((a, b) => b.projectValue - a.projectValue);

    res.json(projects);

});

app.listen(process.env.API_PORT);
