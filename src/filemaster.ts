import * as fse from 'fs-extra';

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
    'gradle': new BuildPair('/build/classes/java/main', '/build/classes/test/main'),
    'ant': new BuildPair('', ''),
    'bazel': new BuildPair('', '')
}

async function getFiles(dir: string, prefix: string): Promise<string[]> {
    const result = await fse.readdir(dir);
    let filelist = Array<string>();

    for(const file of result) {
        if ((await fse.stat(dir + '/' + file)).isDirectory()){
            const subFiles = await getFiles(`${dir}/${file}`, `${prefix + file}.`);
            filelist = filelist.concat(subFiles);
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

    async getIncludes(): Promise<string> {
        return (await getFiles(this.currentWorkspace + this.currentBuild.srcFolder, ''))
                .map(f => f.replace(/.class/g, ''))
                .join(':');
    }

    async copyToBuild(dest: string): Promise<void> {
        const options = { overwrite: false };
        await fse.copy(this.currentWorkspace + this.currentBuild.srcFolder, dest, options);
        await fse.copy(this.currentWorkspace + this.currentBuild.testFolder, dest, options);
    }
}