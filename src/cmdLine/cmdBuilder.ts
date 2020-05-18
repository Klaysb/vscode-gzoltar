'use strict';

import { Command } from "./command";

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