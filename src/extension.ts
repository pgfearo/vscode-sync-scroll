import * as vscode from 'vscode'
import { checkSplitPanels, calculateRange, wholeLine, calculatePosition } from './utils'
import { AllStates } from './states'
import { handleDidChangeEditoSelect, handleDidChangeVisibleEditors, handleScroll, modeState, offsetByEditors, reset, setContext, setCorrespondingLinesHighlight } from './scrollFunctions';

export function activate(context: vscode.ExtensionContext) {
	setContext(context)

	// Register disposables
	context.subscriptions.push(
		modeState.registerCommand(() => {
			reset()
		}),
		vscode.window.onDidChangeVisibleTextEditors(handleDidChangeVisibleEditors),
		vscode.window.onDidChangeTextEditorVisibleRanges(handleScroll),
		vscode.window.onDidChangeTextEditorSelection(handleDidChangeEditoSelect)
	)
	AllStates.init(checkSplitPanels())
}

export function deactivate() { }
