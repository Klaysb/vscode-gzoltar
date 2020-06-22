'use strict';

import * as fse from 'fs-extra';
import { join } from 'path';
import { ReportPanel } from '../reportPanel';
import { Decorator } from '../decoration/decorator';
import { BuildTool } from './build/buildTool';

export class Workspace {

    private readonly path: string;
    private readonly buildTool: BuildTool;
    private readonly configFolder: string;
    private readonly configFile: string;  

    private webview: ReportPanel | undefined;
    private decorator: Decorator | undefined;

    public constructor(path: string, buildTool: BuildTool, configFolder: string, configFile: string) {
        this.path = path;
        this.buildTool = buildTool;
        this.configFolder = configFolder;
        this.configFile = configFile;
    }

    get workspacePath(): string {
        return this.path;
    }

    get configPath(): string {
        return this.configFolder;
    }

    get sourceFolder(): string {
        return join(this.path, this.buildTool.getSourceFolder());
    }

    get testFolder(): string {
        return join(this.path, this.buildTool.getTestFolder());
    }

    public setWebview(newWebview: ReportPanel): void {
        this.webview?.dispose();
        this.webview = newWebview;
    }

    public setDecorator(newDecorator: Decorator): void {
        this.decorator?.dispose();
        this.decorator = newDecorator;
    }

    public async setSourceFolder(newSrcFolder: string): Promise<void> {
        //this.srcFolder = newSrcFolder.replace(this.path, '');
        //return fse.writeFile(this.configFile, `${this.srcFolder}\n${this.tstFolder}`);
    }

    public async setTestFolder(newTestFolder: string): Promise<void> {
        //this.tstFolder = newTestFolder.replace(this.path, '');
        //return fse.writeFile(this.configFile, `${this.srcFolder}\n${this.tstFolder}`);
    }

    public async resetConfig(toolsPath: string): Promise<void> {
        await fse.emptyDir(this.configFolder);
        await fse.copy(toolsPath, this.configFolder, { overwrite: false });
        await fse.writeFile(this.configFile, `${this.buildTool.getSourceFolder()}\n${this.buildTool.getTestFolder()}`);
    }

    public async cleanup(): Promise<void> {
        await Promise.all([
            fse.emptyDir(join(this.configFolder, 'build')),
            fse.emptyDir(join(this.configFolder, 'sfl')),
            fse.remove(join(this.configFolder, 'tests.txt')),
            fse.remove(join(this.configFolder, 'gzoltar.ser'))
        ]);
    }

    public async copyToBuild(): Promise<void> {
        const buildPath = join(this.configFolder, 'build');
        const options = { overwrite: false };
        await fse.copy(this.sourceFolder, buildPath, options);
        await fse.copy(this.testFolder, buildPath, options);
    }

    public async getDependencies(): Promise<string> {
        return this.buildTool.getDependencies(this.path);
    }

    public async getIncludes(): Promise<string> {
        return (await this.getFiles(this.sourceFolder, ''))
            .map(f => f.replace(/.class/g, ''))
            .join(':');
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
}