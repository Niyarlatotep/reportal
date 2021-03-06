import express from 'express';
import {ProjectModel} from "../models/project";
import {Launch, LaunchModel} from "../models/launch";
import {ReportImageModel} from "../models/reportImage";
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import humanizeDuration from 'humanize-duration'
import {subscribes} from "../lib/subscribes";
import {authorizationCheck, isAdmin, onlyAdminAllowed} from "../lib/authorizationCheck";

const projectRouter = express.Router();

projectRouter.get('/launches-update/projects', authorizationCheck, async (req, res) =>{
    console.log('subscribe to launches', 'projects');
    subscribes.subscribe(res, 'projects');
});

projectRouter.get('/projects', authorizationCheck, async (req, res) => {
    TimeAgo.addLocale(en);
    const timeAgo = new TimeAgo('en-US');
    const projects = await ProjectModel.find({}).exec();
    const projectsListForUi = [];
    for (let project of projects){
        const lastLaunch = await LaunchModel.findOne({projectId: project.id}).sort({launchDate: -1}).exec();
        projectsListForUi.push({
            _id: project._id,
            name: project.name,
            isLastLaunchFailed: lastLaunch ? lastLaunch.isFailsExist : false,
            lastLaunchDateAgo: lastLaunch ? timeAgo.format(lastLaunch.launchDate) : null
        });
    }
    res.render('projects', {projects: {list:  projectsListForUi}, isAdmin: isAdmin(req)});
});

projectRouter.post('/project', async (req, res)=>{
    if (!req.body){
        return res.status(400).send('Request body is missing');
    }
    console.log(req.body);
    const model = new ProjectModel(req.body);
    console.log(model);
    try {
        const doc = await model.save();
        subscribes.publish('projects');
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

projectRouter.delete('/project/:projectId', onlyAdminAllowed, async (req, res) => {
    await Promise.all([
        LaunchModel.deleteMany({projectId: req.params.projectId}).exec(),
        ProjectModel.findByIdAndDelete(req.params.projectId).exec(),
        ReportImageModel.deleteMany({projectId: req.params.projectId})
    ]);
    res.sendStatus(200);

});

projectRouter.delete('/project/cleanUp/:projectId', onlyAdminAllowed, async (req, res) => {
    await Promise.all([
        LaunchModel.deleteMany({projectId: req.params.projectId}),
        ReportImageModel.deleteMany({projectId: req.params.projectId})
    ]);
    res.sendStatus(200);
});


projectRouter.get('/project/:projectId', authorizationCheck, async (req, res) => {
    try {
        const launches = await LaunchModel.find({projectId: req.params.projectId}).sort({launchDate: -1}).exec();
        const project = await ProjectModel.findById(req.params.projectId).exec();
        const launchesForUI = launches.map(launch =>{
            let statusCount = {};
            let duration = 0;
            for (let specReport in launch.specsReports){
                for (let browser of launch.browsers){
                    if (launch.specsReports[specReport][browser]){
                        duration = duration + launch.specsReports[specReport][browser].duration;
                        const status = launch.specsReports[specReport][browser].status;
                        statusCount[status] ? statusCount[status]++ : statusCount[status] = 1;
                    }
                }
            }

            const dateString =  launch.launchDate.toLocaleDateString()
                .split('-')
                .reverse()
                .map(str=>{
                    return str.padStart(2, '0');
                })
                .join('.');
            const timeString = launch.launchDate.toLocaleTimeString();

            return {
                _id : launch._id,
                launchName: launch.launchName,
                launchDateLocal: [dateString, timeString].join(' '),
                statusCount: statusCount,
                duration: humanizeDuration(duration * 1000, { round: true }),
                appVersions: launch.appVersions
            };
        });

        res.render('launches', {launches: {list:  launchesForUI, projectId: req.params.projectId, projectName: project.name}, isAdmin: isAdmin(req)});
    } catch (e) {
        console.error(e);
    }
});

export {
    projectRouter
}