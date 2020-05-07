import * as vscode from 'vscode';
import { FileMaster } from './filemaster';
import * as path from 'path';
import * as fse from 'fs-extra';
import util = require('util');
const exec = util.promisify(require('child_process').exec);

export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    /**
     * Functions returning the fully constructed GZoltar command with the correct parameters.
     */

    readonly listFunction = (destPath: string, buildPath: string, resPath: string) => 
        `(cd ${destPath} && java -javaagent:"gzoltaragent.jar" -cp "${buildPath}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main listTestMethods ${resPath})`;

    readonly runFunction = (destPath: string, includes: string) =>
        `(cd ${destPath} && java -javaagent:gzoltaragent.jar=includes="${includes}" -cp "build/":"junit-4.13.jar":"hamcrest-core-2.2.jar":"gzoltarcli.jar" com.gzoltar.cli.Main runTestMethods --testMethods "tests.txt" --collectCoverage)`;

    readonly reportFunction = (destPath: string) =>
        `(cd ${destPath} && java -cp ".":"junit-4.13.jar":"hamcrest-core-2.2.jar":"gzoltarcli.jar" com.gzoltar.cli.Main faultLocalizationReport --buildLocation "build/" --granularity "line" --dataFile gzoltar.ser --family "sfl" --formula "ochiai" --outputDirectory . --formatter HTML)`;
    
    /**
     * GZoltarCommander fields
     */

    readonly commands: GZoltarCommand[];
    readonly fileMaster: FileMaster;
    readonly toolsPath: string;
	readonly buildPath: string;

    constructor(fileMaster: FileMaster, extensionPath: string) {
        this.fileMaster = fileMaster;
        this.toolsPath = path.join(extensionPath, 'tools');
        this.buildPath = path.join(this.toolsPath, 'build');
        this.commands = this.buildCommander();
    }

    buildCommander(): GZoltarCommand[] {
        const listCommand = new GZoltarCommand('Cleanup', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.cleanup', title: ''});
        const runTestCommand = new GZoltarCommand('Run Test Methods', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.run', title: ''});
        const reportCommand = new GZoltarCommand('Generate Report', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.report', title: ''});
        const showviewCommand = new GZoltarCommand('Show View', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.show', title: ''});
        return [listCommand, runTestCommand, reportCommand, showviewCommand];
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

    async cleanup() {
        await Promise.all([
            fse.emptyDir(this.buildPath), fse.emptyDir(`${this.toolsPath}/sfl`),
            fse.remove(`${this.toolsPath}/tests.txt`), fse.remove(`${this.toolsPath}/gzoltar.ser`)]);
        
        vscode.window.showInformationMessage('Cleanup completed.');
    }

    async runTestMethods() {
        
        await fse.remove(`${this.toolsPath}/tests.txt`);
        const { err0, stdout0, stderr0 } = await exec(this.listFunction(this.toolsPath, this.fileMaster.getWorkspace() + this.fileMaster.getTestFolder(), this.fileMaster.getWorkspace()));
        if(err0) {
            return vscode.window.showErrorMessage(err0.message); //TODO error handler
        }

        await fse.remove(`${this.toolsPath}/gzoltar.ser`);
        await this.fileMaster.copyToBuild(this.buildPath);
        const includes = await this.fileMaster.getIncludes();
        
        const { err, stdout, stderr } = await exec(this.runFunction(this.toolsPath, includes));
        if(err) {
            return vscode.window.showErrorMessage(err.message);
        }
        
        vscode.window.showInformationMessage('Run completed.');
    }

    async generateReport() {
        const { err, stdout, stderr } = await exec(this.reportFunction(this.toolsPath));
        if(err) {
            return vscode.window.showErrorMessage(err.message);
        }
        vscode.window.showInformationMessage('Report completed.');
    }

    async showView() {
        // depends on previous methods
        const data = await fse.readFile(`${this.toolsPath}/sfl/html/ochiai/sunburst.html`);
        const html = data.toString();

        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this.toolsPath, "sfl", "html", "ochiai", "gzoltar.js")
        );

        const gzoltarScr = (await fse.readFile(path.join(this.toolsPath, "sfl", "html", "ochiai", "gzoltar.js"))).toString();

        const panel = vscode.window.createWebviewPanel(
            'report',
            'Report',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(this.toolsPath)]
            }
        );
        const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
        panel.webview.html = html.replace('<script type="text/javascript" src="gzoltar.js"></script>', ` <script>${gzoltarScr}</script>`);
        //TODO replace d3 script with a fixed one
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