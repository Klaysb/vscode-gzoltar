'use strict';

export { listFunction, runFunction, reportFunction };

function listFunction(destPath: string, buildPath: string, resPath: string): string {
    return new Command()
        .cd(destPath)
        .newCmd()
        .java()
        .javaagent('"gzoltaragent.jar"')
        .cp(`"${buildPath}"`, '"gzoltarcli.jar"')
        .main(`com.gzoltar.cli.Main listTestMethods ${resPath}`)
        .toString();
}

function runFunction(destPath: string, includes: string): string {
    return new Command()
        .cd(destPath)
        .newCmd()
        .java()
        .javaagent(`gzoltaragent.jar=includes="${includes}"`)
        .cp('"build/"', '"junit-4.13.jar"', '"hamcrest-core-2.2.jar"', '"gzoltarcli.jar"')
        .main(`com.gzoltar.cli.Main runTestMethods --testMethods "tests.txt" --collectCoverage`)
        .toString();
}

function reportFunction(destPath: string): string {
    return new Command()
        .cd(destPath)
        .newCmd()
        .java()
        .cp('"."', '"gzoltarcli.jar"')
        .main('com.gzoltar.cli.Main faultLocalizationReport --buildLocation "build/" --granularity "line" --dataFile gzoltar.ser --family "sfl" --formula "ochiai" --outputDirectory . --formatter HTML')
        .toString();
}

class Command {

    private readonly commands: string[];
    private readonly cpSep: string;

    constructor() {
        this.commands = [];
        this.cpSep = process.platform === 'win32' ? ';' : ':';
    }

    public newCmd(): Command {
        this.commands.push('&&');
        return this;
    }

    public cd(dest: string): Command {
        this.commands.push(`cd ${dest}`);
        return this;
    }

    public java(): Command {
        this.commands.push('java');
        return this;
    }

    public javaagent(agentJar: string): Command {
        this.commands.push(`-javaagent:${agentJar}`);
        return this;
    }

    public cp(...args: string[]): Command {
        this.commands.push(`-cp ${args.join(this.cpSep)}`);
        return this;
    }

    public main(mainArgs: string): Command {
        this.commands.push(mainArgs);
        return this;
    }

    public toString(): string {
        return `(${this.commands.join(' ')})`;
    }
}