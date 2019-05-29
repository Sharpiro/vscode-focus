import * as vscode from 'vscode';
import * as path from "path"

interface Container {
	uri: vscode.Uri
	emitter: vscode.EventEmitter<vscode.Uri>
}

const containers = new Map<string, Container>();

export function activate({ subscriptions }: vscode.ExtensionContext) {

	const myScheme = 'vscode-focus';
	const myProvider = new class implements vscode.TextDocumentContentProvider {
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		_subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {
			containers.delete(doc.uri.toString())
		})

		dispose() {
			this._subscriptions.dispose();
			containers.clear()
		}

		provideTextDocumentContent(uri: vscode.Uri): string {
			const container = containers.get(uri.toString())
			if (!container) {
				containers.set(uri.toString(), { uri: uri, emitter: this.onDidChangeEmitter })
			}
			const activeEditor = vscode.window.activeTextEditor as vscode.TextEditor
			const text = activeEditor.document.getText(activeEditor.selection)
			return text
		}
	}
	subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

	subscriptions.push(vscode.commands.registerCommand('vscode-focus.focus', async () => {
		const activeEditor = vscode.window.activeTextEditor
		if (activeEditor && !activeEditor.selection.isEmpty) {
			const filename = path.basename(activeEditor.document.fileName)
			const uri = vscode.Uri.parse(`${myScheme}:focus-${filename}`);
			const container = containers.get(uri.toString())
			if (container) {
				container.emitter.fire(uri)
				// return
			}
			await vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Two });
		}
	}));
}
