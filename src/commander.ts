'use strict';

import * as vscode from 'vscode';
import { join } from 'path';
import * as fse from 'fs-extra';
import util = require('util');
import { FileMaster } from './filemaster';
import { listFunction, runFunction, reportFunction } from './cmdBuilder';
const exec = util.promisify(require('child_process').exec);


export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    /**
     * GZoltarCommander fields
     */

    private readonly commands: GZoltarCommand[];
    private readonly fileMaster: FileMaster;
    private readonly configPath: string;
    private readonly buildPath: string;
    private docChanged: boolean = true;

    constructor(fileMaster: FileMaster) {
        this.fileMaster = fileMaster;
        this.configPath = fileMaster.getConfig();
        this.buildPath = join(this.configPath, 'build');
        this.commands = this.buildCommander();

        vscode.workspace.onDidChangeTextDocument((_e: vscode.TextDocumentChangeEvent) => {
            this.docChanged = true;
        });
    }

    buildCommander(): GZoltarCommand[] {
        const runTestCommand = new GZoltarCommand('Run GZoltar', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.run', title: 'Run GZoltar' });
        const showViewCommand = new GZoltarCommand('Show Views', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.show', title: 'Show Views' });
        const resetCommand = new GZoltarCommand('Reset Config', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.reset', title: 'Reset Config' });
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
        return exec(listFunction(this.configPath, this.fileMaster.getTestFolder(), this.fileMaster.getWorkspace()))
            .then(() => { })
            .catch((_err: any) => {
                const e = '';
            });
    }

    private async runTests(): Promise<void> {
        await fse.remove(join(this.configPath, 'gzoltar.ser'));
        await this.fileMaster.copySourcesTo(this.buildPath);

        const includes = await this.fileMaster.getIncludes();
        return exec(runFunction(this.configPath, includes))
            .then(() => { })
            .catch((_err: any) => {
                const e = '';
            });
    }

    private async report(): Promise<void> {
        return exec(reportFunction(this.configPath))
            .then(() => { })
            .catch((_e: Error) => {
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