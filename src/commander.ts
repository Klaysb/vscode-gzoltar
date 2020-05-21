'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join, sep } from 'path';
import { FileMaster } from './filemaster';
import { listFunction, runFunction, reportFunction } from './cmdLine/cmdBuilder';
import { ReportPanel } from './reportPanel';
import util = require('util');
import { EOL } from 'os';
import { Decorator } from './decorator';
const exec = util.promisify(require('child_process').exec);


export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

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

        vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
            this.docChanged = true;
        });

        vscode.workspace.onDidCreateFiles((e: vscode.FileCreateEvent) => {
            this.docChanged = true;
        });

        vscode.workspace.onDidDeleteFiles((e: vscode.FileDeleteEvent) => {
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

    async reset(toolspath: string) {
        this.docChanged = true;
        await this.fileMaster.resetConfig(toolspath);
        vscode.window.showInformationMessage('Reset Completed.');
    }

    async run() {
        await this.cleanup();
        await this.list();
        await this.runTests();
        await this.report();
        await this.rankings();
        this.docChanged = false;
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
        return exec(listFunction(this.configPath, this.fileMaster.getTestFolder(), this.fileMaster.getWorkspace()))
            .catch((_err: any) => { });
    }

    private async runTests(): Promise<void> {
        await this.fileMaster.copySourcesTo(this.buildPath);
        const includes = await this.fileMaster.getIncludes();

        return exec(runFunction(this.configPath, includes))
            .catch((_err: any) => { });
    }

    private async report(): Promise<void> {
        return exec(reportFunction(this.configPath))
            .catch((_e: Error) => { });
    }

    private async rankings(): Promise<void> {
        const ranking = (await fse.readFile(join(this.configPath, 'sfl', 'txt', 'ochiai.ranking.csv'))).toString();
        Decorator.createDecorator(ranking);
        // const regex = /[\w()<>._-]+/g;
        // const test = 'org.gzoltar.examples$StaticField#StaticField():22;0.0';
        // const res = test.match(regex);
        // if (res === null) {
        //     return;
        // }
        // const fn = this.fileMaster.getWorkspace() + '/src/main/java/' + join(res[0].replace(/\./g, sep), res[1]) + '.java';
        // const document = await vscode.workspace.openTextDocument(fn);
        // const lnum = +res[3];
        // const line = document.lineAt(lnum - 1);

        // const decorationType = vscode.window.createTextEditorDecorationType({
        //     backgroundColor: 'green',
        //     border: '2px solid white',
        //   });
        
        // const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, vscode.EndOfLine.LF));
        // const eds = vscode.window.visibleTextEditors;
        // eds.forEach(ed => {
        //     ed.setDecorations(decorationType, [{ range }]);
        // });
        // vscode.window.onDidChangeActiveTextEditor((te) => {
        //     if (te !== undefined) {
        //         te.setDecorations(decorationType, [{ range }]);
        //         const dn = te.document.fileName;
        //         const a = '';
        //     }
        // });
    }

    async showViews(toolspath: string) {
        if (this.docChanged) {
            await this.run();
        }

        ReportPanel.createOrShow(toolspath, this.configPath);
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