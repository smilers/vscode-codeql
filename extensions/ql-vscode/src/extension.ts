import { commands, ExtensionContext, window as Window } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { DatabaseManager } from './databases';
import { spawnIdeServer } from './ide-server';
import { InterfaceManager } from './interface';
import { compileAndRunQueryAgainstDatabase, EvaluationInfo, spawnQueryServer, tmpDirDisposal } from './queries';
import * as qsClient from './queryserver-client';
import { QLConfiguration } from './config';
import { QueryHistoryItem, QueryHistoryManager } from './query-history';
import * as archiveFilesystemProvider from './archive-filesystem-provider';

/**
* extension.ts
* ------------
*
* A vscode extension for QL query development.
*/

export function activate(ctx: ExtensionContext) {

  const qlConfiguration = new QLConfiguration();
  const qs = spawnQueryServer(qlConfiguration);
  const dbm = new DatabaseManager(ctx);
  const qhm = new QueryHistoryManager(ctx, item => showResultsForInfo(item.info));
  const intm = new InterfaceManager(ctx, msg => {
    if (qs != undefined) { qs.log(msg) }
  });
  archiveFilesystemProvider.activate(ctx);

  function showResultsForInfo(info: EvaluationInfo) {
    intm.showResults(ctx, info);
  }

  async function compileAndRunQueryAsync(qs: qsClient.Server, quickEval: boolean): Promise<EvaluationInfo> {
    const dbItem = await dbm.getDatabaseItem();
    if (dbItem == undefined) {
      throw new Error('Can\'t run query without a selected database');
    }
    return compileAndRunQueryAgainstDatabase(qs, dbItem, quickEval);
  }

  function compileAndRunQuerySync(
    quickEval: boolean,
  ) {
    if (qs !== undefined) {
      compileAndRunQueryAsync(qs, quickEval)
        .then(info => {
          showResultsForInfo(info);
          qhm.push(new QueryHistoryItem("query", "db", info));
        })
        .catch(e => {
          if (e instanceof Error)
            Window.showErrorMessage(e.message);
          else
            throw e;
        });
    }
  }

  ctx.subscriptions.push(tmpDirDisposal);

  let client = new LanguageClient('ql', () => spawnIdeServer(qlConfiguration), {
    documentSelector: ['ql'],
    synchronize: {
      configurationSection: 'ql'
    }
  }, true);

  ctx.subscriptions.push(commands.registerCommand('ql.setCurrentDatabase', (db) => dbm.setCurrentDatabase(db)));
  ctx.subscriptions.push(commands.registerCommand('ql.chooseDatabase', () => dbm.chooseAndSetDatabaseSync()));
  ctx.subscriptions.push(commands.registerCommand('qlDatabases.setCurrentDatabase', (db) => dbm.setCurrentItem(db)));
  ctx.subscriptions.push(commands.registerCommand('qlDatabases.removeDatabase', (db) => dbm.removeItem(db)));
  ctx.subscriptions.push(commands.registerCommand('ql.runQuery', () => compileAndRunQuerySync(false)));
  ctx.subscriptions.push(commands.registerCommand('ql.quickEval', () => compileAndRunQuerySync(true)));

  ctx.subscriptions.push(client.start());
}
