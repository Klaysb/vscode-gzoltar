import { workspace } from "vscode";
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import { exec } from 'child_process';
import { readFile, readFileSync } from 'fs';

enum FolderStruct {
    Maven = '/target/classes',
    Gradle = '/build/classes/java/main',
    Ant = '',
    Default = '.'
}

export class FileMaster {

    currentStruct: FolderStruct = FolderStruct.Default;
    currentWorkspace: string = '';

    async isJavaProject(): Promise<boolean> {

        if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
            return false;
        }

        for (const workspaceFolder of workspace.workspaceFolders) {
            if (await this.isJavaFolder(workspaceFolder.uri.fsPath)) {
                this.currentWorkspace = workspaceFolder.uri.fsPath;
                return true;
            }
        }

        return false;
    }

    async isJavaFolder(folderPath: string): Promise<boolean> {
        return await fse.pathExists(path.join(folderPath, 'pom.xml')) 
            || await fse.pathExists(path.join(folderPath, 'build.gradle')) 
            || await fse.pathExists(path.join(folderPath, 'build.xml'));
    }

    getIncludes(folder: string) : string[] {
        fs.readdir(folder, (err, files) => {
            if (err) return console.error(err.message);
            console.log('y');
        });
        return [];
    }
}