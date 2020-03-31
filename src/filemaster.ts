import * as fs from 'fs';
import * as glob from 'glob';

class BuildPair {
    readonly srcFolder: string;
    readonly testFolder: string;

    constructor(sourceFolder: string, testFolder: string) {
        this.srcFolder = sourceFolder;
        this.testFolder = testFolder;
    }
}

const BuildPairs: { [index: string] : BuildPair } = {
    'maven': new BuildPair('/target/classes', '/target/test-classes'),
    'gradle': new BuildPair('/build/classes/java/main', ''),
    'ant': new BuildPair('', ''),
    'bazel': new BuildPair('', '')
}

function getFiles(dir: string, prefix: string): string[] {
    const result = fs.readdirSync(dir);
    let filelist = Array<string>();
    for(const file of result) {
        if (fs.statSync(dir + '/' + file).isDirectory()){
            filelist = filelist.concat(getFiles(dir + '/' + file, prefix + file + '.'));
        }
        else {
            filelist.push(prefix + file);
        }
    }
    return filelist;
}

export class FileMaster {

    readonly currentBuild: BuildPair;
    readonly currentWorkspace: string;

    constructor(buildTool: string, workspace: string) {
        this.currentBuild = BuildPairs[buildTool];
        this.currentWorkspace = workspace;
    }

    getWorkspace(): string {
        return this.currentWorkspace;
    }

    getSourceFolder(): string {
        return this.currentBuild.srcFolder;
    }

    getTestFolder(): string {
        return this.currentBuild.testFolder;
    }

    getIncludes(): string {
        const r = getFiles(this.currentWorkspace + this.currentBuild.srcFolder, '')
                    .map(f => f.replace(/.class/g, ''))
                    .join(':');
        return r;
    }
}