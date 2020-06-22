'use strict';

import * as fse from 'fs-extra';
import { join } from 'path';
const exec = require('util').promisify(require('child_process').exec);

export { BuildTool, Maven, Gradle };

interface BuildTool {
    
    getSourceFolder(): string;
    getTestFolder(): string;
    getDependencies(projectPath: string): Promise<string>;
    
}

class Maven implements BuildTool {

    getSourceFolder(): string {
        return '/target/classes';
    }

    getTestFolder(): string {
        return '/target/test-classes';
    }

    async getDependencies(projectPath: string): Promise<string> {
        await exec(`(cd ${projectPath} && mvn dependency:build-classpath -Dmdep.outputFile="cp.txt")`);
        const dep = (await fse.readFile(join(projectPath, 'cp.txt'))).toString();
        return dep.replace('\n', ':');
    }
}

class Gradle implements BuildTool {

    getSourceFolder(): string {
        return '/build/classes/java/main';
    }

    getTestFolder(): string {
        return '/build/classes/java/test';
    }

    getDependencies(projectPath: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

}