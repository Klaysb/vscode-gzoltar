'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join } from 'path';

export class FileMaster {

    private static readonly CONFIG_FOLDER: string = '.gzoltar/';
    private static readonly CONFIG_FILE: string = 'folders.txt';
    private static readonly MAVEN_DIR: [string, string] = ['/target/classes', '/target/test-classes'];
    private static readonly GRADLE_DIR: [string, string] = ['/build/classes/java/main', '/build/classes/java/test'];

    private readonly currentWorkspace: string;
    private readonly configFile: string;
    private sourceFolder: string;
    private testFolder: string;

    private constructor(workspace: string, srcFolder: string = '', testFolder: string = '') {
        this.currentWorkspace = workspace;
        this.configFile = join(this.currentWorkspace, FileMaster.CONFIG_FOLDER, FileMaster.CONFIG_FILE);
        this.sourceFolder = srcFolder;
        this.testFolder = testFolder;
    }

    public getWorkspace(): string {
        return this.currentWorkspace;
    }

    public getConfig(): string {
        return join(this.currentWorkspace, FileMaster.CONFIG_FOLDER);
    }

    public getSourceFolder(): string {
        return join(this.currentWorkspace, this.sourceFolder);
    }

    public async setSourceFolder(newSrcFolder: string): Promise<void> {
        this.sourceFolder = newSrcFolder.replace(this.currentWorkspace, '');
        return fse.writeFile(this.configFile, `${this.sourceFolder}\n${this.testFolder}`);
    }

    public getTestFolder(): string {
        return join(this.currentWorkspace, this.testFolder);
    }

    public async setTestFolder(newTestFolder: string): Promise<void> {
        this.testFolder = newTestFolder.replace(this.currentWorkspace, '');
        return fse.writeFile(this.configFile, `${this.sourceFolder}\n${this.testFolder}`);
    }

    public async getIncludes(): Promise<string> {
        return (await this.getFiles(join(this.currentWorkspace, this.sourceFolder), ''))
            .map(f => f.replace(/.class/g, ''))
            .join(':');
    }

    public async resetConfig(toolsPath: string): Promise<void> {
        const configFolder = this.getConfig();
        const folders = FileMaster.verifyBuildTool(this.currentWorkspace);
        await fse.emptyDir(configFolder);
        await fse.copy(toolsPath, configFolder, { overwrite: false });
        await fse.writeFile(this.configFile, `${folders[0]}\n${folders[1]}`);
    }

    public async copySourcesTo(dest: string): Promise<void> {
        const options = { overwrite: false };
        await fse.copy(join(this.currentWorkspace, this.sourceFolder), dest, options);
        await fse.copy(join(this.currentWorkspace, this.testFolder), dest, options);
    }

    private async getFiles(dir: string, prefix: string): Promise<string[]> {
        const result = await fse.readdir(dir);
        let filelist = Array<string>();

        for (const file of result) {
            if ((await fse.stat(dir + '/' + file)).isDirectory()) {
                const subFiles = await this.getFiles(`${dir}/${file}`, `${prefix + file}.`);
                filelist = filelist.concat(subFiles);
            }
            else {
                filelist.push(prefix + file);
            }
        }
        return filelist;
    }

    public static async createFileMaster(workspace: string, toolsPath: string): Promise<FileMaster> {
        const configFolder = join(workspace, this.CONFIG_FOLDER);
        const configFile = join(configFolder, this.CONFIG_FILE);
        await fse.ensureDir(configFolder);

        if ((await fse.pathExists(configFile))) {
            const cFile = (await fse.readFile(configFile)).toString();
            const folders = cFile.split('\n');
            return new FileMaster(workspace, folders[0], folders[1]);
        }

        const folders = this.verifyBuildTool(workspace);
        await fse.copy(toolsPath, configFolder, { overwrite: false });
        await fse.writeFile(configFile, `${folders[0]}\n${folders[1]}`);
        return new FileMaster(workspace, folders[0], folders[1]);
    }

    private static verifyBuildTool(workspace: string): [string, string] {
        if (fse.pathExistsSync(join(workspace, 'pom.xml'))) {
            return this.MAVEN_DIR;
        }
        if (fse.pathExistsSync(join(workspace, 'build.gradle'))) {
            return this.GRADLE_DIR;
        }
        vscode.window.showInformationMessage('Please mark the respective source and test folders by right-clicking the desired folders.');
        return ['', ''];
    }
}