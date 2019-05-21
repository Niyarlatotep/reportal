import * as express from 'express';
import {ClientReport, Launch, LaunchModel, SpecReport} from "../models/launch";
import {ProjectModel} from "../models/project";
import {Types} from "mongoose";
import {subscribes} from "./subscribes";
import {projectRouter} from "./project";

const reportRouter = express.Router();

reportRouter.get('/report/:launchId', async (req, res) => {
    const launch = await LaunchModel.findById(req.params.launchId).exec();
    const resultsSorted: {launchName: string, specId: string, browsersResults: (ClientReport | string)[]}[] = [];
    for (const specReport in launch.specsReports){
        let sortedBrowserResults: (ClientReport | string)[] = [];
        for (const browser of launch.browsers){
            sortedBrowserResults.push(launch.specsReports[specReport][browser] || '')
        }
        resultsSorted.push({launchName: launch.launchName, specId: specReport, browsersResults: sortedBrowserResults});
    }
    res.render('reports', {launch: { launchName: launch.launchName,
            browsers: launch.browsers, specsReports: resultsSorted, projectId: launch.projectId, launchId: launch._id}});
});

reportRouter.get('/report-update/:launchId', async (req, res) =>{
    console.log(req.params.launchId);
    subscribes.subscribe(res, req.params.launchId);
});

reportRouter.get('/launches-update/:projectId', async (req, res) =>{
    subscribes.subscribe(res, req.params.projectId);
});

projectRouter.delete('/launch/:launchId', async (req, res) => {
    await LaunchModel.findByIdAndDelete(req.params.launchId).exec();
    res.sendStatus(200);
});

reportRouter.post('/report', async (req, res) =>{

    if (!req.body){
        return res.status(400).send('Request body is missing');
    }
    const requestBody: ClientReport = req.body;
    requestBody.utcStarted = new Date(requestBody.utcStarted);


    if (!Types.ObjectId.isValid(requestBody.projectId)){
        console.log('id is invalid');
        return res.sendStatus(400);
    }

    const project = await ProjectModel.findById(requestBody.projectId).exec();
    if (!project){
        return res.sendStatus(404);
    }

    const launch = await LaunchModel.findOne({launchName: requestBody.launchName, projectId: requestBody.projectId}).exec();
    if (!launch){
        const launch = new LaunchModel({
            launchName: requestBody.launchName,
            projectId: requestBody.projectId,
            launchDate: requestBody.utcStarted,
            specsReports: {[requestBody.specId]: {[requestBody.browserName]: requestBody}},
            browsers: [requestBody.browserName]
        });
        try {
            await launch.save();
            res.sendStatus(200);
            subscribes.publish(requestBody.projectId);
        } catch (err) {
            console.error(err);
            return res.status(500).json(err);
        }
    } else {
        if (launch.specsReports[requestBody.specId]){
            //if report exists
            if (launch.specsReports[requestBody.specId][requestBody.browserName]){
                //if such browser exists yet can't be duplicate
                res.status(500).json('Browser name duplicate');
                throw new Error('Browser name duplicate');
            }
            launch.specsReports[requestBody.specId][requestBody.browserName] = requestBody;
        } else {
            launch.specsReports[requestBody.specId] = {[requestBody.browserName]: requestBody};
        }
        launch.markModified('specsReports');

        if (!launch.browsers.includes(requestBody.browserName)){
            launch.browsers.push(requestBody.browserName);
            launch.markModified('browsers');
        }

        try {
            await launch.save();
            res.sendStatus(200);
            console.log(`New spec results added`);
            subscribes.publish(launch._id);
        } catch (err) {
            console.error(err);
            return res.status(500).json(err);
        }
    }
});

export {
    reportRouter
}