'use strict';

import * as fse from 'fs-extra';
import { join } from 'path';
import { Workspace } from './workspace';
import { Maven, BuildTool, Gradle } from './buildTool';

export class WSContainer {

    private static readonly CONFIG_FOLDER: string = '.gzoltar/';
    private static readonly CONFIG_FILE: string = 'folders.txt';

    private readonly workspaces: { [key: string]: Workspace };

    public constructor() {
        this.workspaces = {};
    }

    public getWorkspace(key: string): Workspace {
        return this.workspaces[key];
    }

    public addWorkspaces(newWorkspaces: string[], toolsPath: string) {
        newWorkspaces.forEach(async w => {
            return this.workspaces[w] = await this.createWorkspace(w, toolsPath);
        });
    }

    public removeWorkspaces(oldWorkspaces: string[]) {
        oldWorkspaces.forEach(w => {
            delete this.workspaces[w];
        });
    }

    private async createWorkspace(path: string, toolsPath: string): Promise<Workspace> {
        const configFolderPath = join(path, WSContainer.CONFIG_FOLDER);
        const configFilePath = join(configFolderPath, WSContainer.CONFIG_FILE);

        if (!(await fse.pathExists(configFolderPath))) {
            await fse.copy(toolsPath, configFolderPath, { overwrite: false });
        }

        const tool = this.getBuildTool(path);
        return new Workspace(path, tool, configFolderPath, configFilePath);
    }

    private getBuildTool(workspace: string): BuildTool {
        if (fse.pathExistsSync(join(workspace, 'pom.xml'))) {
            return new Maven();
        }
        if (fse.pathExistsSync(join(workspace, 'build.gradle'))) {
            return new Gradle();
        }

        throw new Error('Build tool not found.');
    }
}