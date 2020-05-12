import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';

export class FileMaster {

    readonly MAVEN_DIR: [string, string] = ['/target/classes', '/target/test-classes'];
    readonly GRADLE_DIR: [string, string] = ['/build/classes/java/main', '/build/classes/java/test'];

    readonly currentWorkspace: string;
    sourceFolder: string = '';
    testFolder: string = '';

    constructor(workspace: string) {
        this.currentWorkspace = workspace;
        this.verifyBuildTool();
    }

    private verifyBuildTool() {
        if (fse.pathExistsSync(path.join(this.currentWorkspace, 'pom.xml'))) {
            this.sourceFolder = this.currentWorkspace + this.MAVEN_DIR[0];
            this.testFolder = this.currentWorkspace + this.MAVEN_DIR[1];
        }
        else if (fse.pathExistsSync(path.join(this.currentWorkspace, 'build.gradle'))) {
            this.sourceFolder = this.currentWorkspace + this.GRADLE_DIR[0];
            this.testFolder = this.currentWorkspace + this.GRADLE_DIR[1];
        }
        else {
            vscode.window.showInformationMessage('Please mark the respective source and test folders by right-clicking the desired folders.');
        }
    }

    getWorkspace(): string {
        return this.currentWorkspace;
    }

    getSourceFolder(): string {
        return this.sourceFolder;
    }

    setSourceFolder(newSrcFolder: string): void {
        this.sourceFolder = newSrcFolder;
    }

    getTestFolder(): string {
        return this.testFolder;
    }

    setTestFolder(newTestFolder: string): void {
        this.testFolder = newTestFolder;
    }

    async getIncludes(): Promise<string> {
        return (await this.getFiles(this.sourceFolder, ''))
                .map(f => f.replace(/.class/g, ''))
                .join(':');
    }

    async copyTo(dest: string): Promise<void> {
        const options = { overwrite: false };
        await fse.copy(this.sourceFolder, dest, options);
        await fse.copy(this.testFolder, dest, options);
    }

    private async getFiles(dir: string, prefix: string): Promise<string[]> {
        const result = await fse.readdir(dir);
        let filelist = Array<string>();
    
        for(const file of result) {
            if ((await fse.stat(dir + '/' + file)).isDirectory()){
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