'use strict';

import * as vscode from 'vscode';
import { join } from 'path';
import * as fse from 'fs-extra';
import util = require('util');
import { FileMaster } from './filemaster';
const exec = util.promisify(require('child_process').exec);


export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    /**
     * Functions returning the fully constructed GZoltar command with the correct parameters.
     */

    private readonly listFunction = (destPath: string, buildPath: string, resPath: string) => 
        `(cd ${destPath} && java -javaagent:"gzoltaragent.jar" -cp "${buildPath}":"gzoltarcli.jar" com.gzoltar.cli.Main listTestMethods ${resPath})`;

    private readonly runFunction = (destPath: string, includes: string) =>
        `(cd ${destPath} && java -javaagent:gzoltaragent.jar=includes="${includes}" -cp "build/":"junit-4.13.jar":"hamcrest-core-2.2.jar":"gzoltarcli.jar" com.gzoltar.cli.Main runTestMethods --testMethods "tests.txt" --collectCoverage)`;

    private readonly reportFunction = (destPath: string) =>
        `(cd ${destPath} && java -cp ".":"gzoltarcli.jar" com.gzoltar.cli.Main faultLocalizationReport --buildLocation "build/" --granularity "line" --dataFile gzoltar.ser --family "sfl" --formula "ochiai" --outputDirectory . --formatter HTML)`;
    
    /**
     * GZoltarCommander fields
     */

    private readonly commands: GZoltarCommand[];
    private readonly fileMaster: FileMaster;
    private readonly configPath: string;
	private readonly buildPath: string;

    constructor(fileMaster: FileMaster) {
        this.fileMaster = fileMaster;
        this.configPath = fileMaster.getConfig();
        this.buildPath = join(this.configPath, 'build');
        this.commands = this.buildCommander();
    }

    buildCommander(): GZoltarCommand[] {
        // process.platform
        // path.sep
        //TODO command TITLES
        vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
            // TODO update commander
        });

        const runTestCommand = new GZoltarCommand('Run GZoltar', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.run', title: ''});
        const showViewCommand = new GZoltarCommand('Show Views', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.show', title: ''});
        const resetCommand = new GZoltarCommand('Reset Config', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.reset', title: ''});
        return [runTestCommand, showViewCommand, resetCommand];
    }

    getTreeItem(element: GZoltarCommand): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: GZoltarCommand | undefined): vscode.ProviderResult<GZoltarCommand[]> {
        if (!element) {
            return Promise.resolve(this.commands);
        }
        return Promise.resolve(element.children);
    }

    async run() {
        // TODO verify if any change happened between previous executions of this method
        // so as to avoid needless repetition
        await this.cleanup();
        await this.list();
        await this.runTests();
        await this.report();
        vscode.window.showInformationMessage('Run Completed.');
    }

    private async cleanup(): Promise<void> {
        await Promise.all([
            fse.emptyDir(this.buildPath), 
            fse.emptyDir(join(this.configPath, 'sfl')),
            fse.remove(join(this.configPath, 'tests.txt')), 
            fse.remove(join(this.configPath, 'gzoltar.ser'))
        ]);
    }
    
    private async list(): Promise<void> {
        await fse.remove(join(this.configPath, 'tests.txt'));
        return exec(this.listFunction(this.configPath, this.fileMaster.getTestFolder(), this.fileMaster.getWorkspace()))
            .then(() => {})
            .catch((err: any) => {
                const e = '';
            });
    }

    private async runTests(): Promise<void> {
        await fse.remove(join(this.configPath, 'gzoltar.ser'));
        await this.fileMaster.copySourcesTo(this.buildPath);

        const includes = await this.fileMaster.getIncludes();
        return exec(this.runFunction(this.configPath, includes))
            .then(() => {})
            .catch((err: any) => {
                const e = '';
            });
    }

    private async report(): Promise<void> {
        return exec(this.reportFunction(this.configPath))
            .then(() => {})
            .catch((e: Error) => {
                const a = '';
            });
    }

    async showViews() {
        // check for changes on files before calling previous methods
        // depends on previous methods
        const data = await fse.readFile(`${this.configPath}/sfl/html/ochiai/sunburst.html`);
        const html = data.toString();

        const scriptPathOnDisk = vscode.Uri.file(
            join(this.configPath, "sfl", "html", "ochiai", "gzoltar.js")
        );

        const gzoltarScr = (await fse.readFile(join(this.configPath, "sfl", "html", "ochiai", "gzoltar.js"))).toString();

        const panel = vscode.window.createWebviewPanel(
            'report',
            'Report',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(this.configPath)]
            }
        );
        const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
        panel.webview.html = html.replace('<script type="text/javascript" src="gzoltar.js"></script>', ` <script>${gzoltarScr}</script>`);
        //TODO replace d3 script with a fixed one
        //TODO save instance of webview so no duplicates are created
    }

    async resetConfig() {

    }
}

export class GZoltarCommand extends vscode.TreeItem {

    public children: GZoltarCommand[] = [];

    constructor(
        public readonly label: string, 
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}