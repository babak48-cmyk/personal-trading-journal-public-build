import type {SetupVersion} from './services/localApi';

/** When the server returned an ID, ONLY that exact persisted ID proves success.
 * A matching name or same Setup family is not enough (history is versioned).
 */
export function verifiedSetupSaveVersion(
  versions:readonly SetupVersion[],expectedVersionId:string|null,
):SetupVersion|null{
 if(!expectedVersionId)return null;
 return versions.find(version=>version.version_id===expectedVersionId)??null;
}
