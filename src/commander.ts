import * as vscode from 'vscode'
import { FileMaster } from './filemaster';
import * as path from 'path';
import * as fse from 'fs-extra';
import util = require('util');
const exec = util.promisify(require('child_process').exec);

export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {
    
    commands: GZoltarCommand[];
    filemaster: FileMaster;

    readonly toolsPath: string;
	readonly buildPath: string;

    constructor(filemaster: FileMaster, context: vscode.ExtensionContext) {
        this.filemaster = filemaster;
        this.toolsPath = path.join(context.extensionPath, 'tools');
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
        await fse.emptyDir(this.buildPath);
        await fse.emptyDir(`${this.toolsPath}/sfl`);
        await fse.remove(`${this.toolsPath}/tests.txt`);
        await fse.remove(`${this.toolsPath}/gzoltar.ser`);
    }

    async runTestMethods() {
        vscode.window.showInformationMessage('List was activated.');
        
        await fse.remove(`${this.toolsPath}/tests.txt`);
        const { err0, stdout0, stderr0 } = await exec(`(cd ${this.toolsPath} && java -javaagent:"gzoltaragent.jar" -cp "${this.filemaster.getWorkspace() + this.filemaster.getTestFolder()}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main listTestMethods ${this.filemaster.getWorkspace()})`);
        if(err0) return vscode.window.showErrorMessage(err0.message);

        await fse.remove(`${this.toolsPath}/gzoltar.ser`);
        await this.filemaster.copyToBuild(this.buildPath);
        const includes = await this.filemaster.getIncludes();
        
        const { err, stdout, stderr } = await exec(`(cd ${this.toolsPath} && java -javaagent:gzoltaragent.jar=includes="${includes}" -cp "build/":"junit-4.13.jar":"hamcrest-core-2.2.jar":"gzoltarcli.jar" com.gzoltar.cli.Main runTestMethods --testMethods "tests.txt" --collectCoverage)`);
        if(err) return vscode.window.showErrorMessage(err.message);
        
        vscode.window.showInformationMessage('Run completed.')
    }

    async generateReport() {
        const { err, stdout, stderr } = await exec(`(cd ${this.toolsPath} && java -cp ".":"junit-4.13.jar":"hamcrest-core-2.2.jar":"gzoltarcli.jar" com.gzoltar.cli.Main faultLocalizationReport --buildLocation "build/" --granularity "line" --dataFile gzoltar.ser --family "sfl" --formula "ochiai" --outputDirectory . --formatter HTML)`);
        if(err) return vscode.window.showErrorMessage(err.message);
        vscode.window.showInformationMessage('Report completed.')
    }

    async showView() {
        // depends on previous methods

		fse.readFile(`${this.toolsPath}/sfl/html/ochiai/sunburst.html`, (err, data) => {
			if (err) throw err;
			const html = data.toString();

			const scriptPathOnDisk = vscode.Uri.file(
				path.join(this.toolsPath, "sfl", "html", "ochiai", "gzoltar.js")
			);
			const gzoltarScr = fse.readFileSync(path.join(this.toolsPath, "sfl", "html", "ochiai", "gzoltar.js")).toString();

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
		});
    }
}

export class GZoltarCommand extends vscode.TreeItem {

    public children: GZoltarCommand[] = []

    constructor(
        public readonly label: string, 
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)
    }
}