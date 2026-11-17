/** Pending new evidence is a draft, never part of an immutable saved Setup version. */
export function hasPendingSetupEvidence(name:string,role:string,help:string):boolean{
 return name.trim().length>0||help.trim().length>0||role!=='SUPPORTING';
}
