import * as express from 'express';
import {ProjectModel} from "../models/project";
import {Launch, LaunchModel} from "../models/launch";

const projectRouter = express.Router();

projectRouter.get('/projects', async (req, res) => {
    const projects = await ProjectModel.find({}).exec();
    res.render('projects', {projects: {list:  projects}});
});

projectRouter.post('/project', async (req, res) => {
    if (!req.body){
        return res.status(400).send('Request body is missing');
    }
    console.log(req.body);
    const model = new ProjectModel(req.body);
    console.log(model);
    try {
        const doc = await model.save();
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

projectRouter.delete('/project/:projectId', async (req, res) => {
    console.log(req.params.projectId);
    res.sendStatus(200);
    await ProjectModel.remove({_id: req.params.projectId}).exec();
    await LaunchModel.remove({projectId: req.params.projectId}).exec();
});

projectRouter.get('/project/:projectId', async (req, res) => {
    const launches: Launch[] = await LaunchModel.find({projectId: req.params.projectId}).sort({launchDate: -1});
    const localLaunches: any = [...launches];
    //todo add typing and move to date converter
    localLaunches.forEach(launch =>{
        const dateString =  launch.launchDate.toLocaleDateString()
            .split('-')
            .reverse()
            .map(str=>{
                return str.padStart(2, '0');
            })
            .join('.');

        const timeString = launch.launchDate.toLocaleTimeString();
        launch.launchDateLocal = [dateString, timeString].join(' ');
    });
    //todo move to reports
    res.render('launches', {launches: {list:  localLaunches, projectId: req.params.projectId}});
});

export {
    projectRouter
}