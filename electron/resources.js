import fs from 'fs';
import { getAppDataPath, getSourcePath } from './ipc/pathHandlers.js';
import path from'path';


export async function ensureProjectResources() {
    const appProjectPath = path.join(getAppDataPath(), 'Project');
    const sourceProjectPath = path.join(getSourcePath(), 'Project');

    if (!fs.existsSync(appProjectPath)) {
        console.log('Project resources not found in app data:', appProjectPath);
        console.log('Copying project resources from:', sourceProjectPath);
        if (fs.existsSync(sourceProjectPath)) {
            await copyRecursiveAsync(sourceProjectPath, appProjectPath);
            console.log('Project resources copied successfully');
        } else {
            console.log('Source project resources not found:', sourceProjectPath);
        }
    } else {
        console.log('Project resources found in app data:', appProjectPath);
    }
}

async function copyRecursiveAsync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);

        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            await copyRecursiveAsync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
