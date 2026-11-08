import { isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type AttachmentCaptionIssue = Readonly<{id:string;label:string}>;

/** Only an attempted new screenshot import requires a caption, and only when
 * the trader has opted in to Required. Older attachments remain untouched. */
export function attachmentCaptionIssue(overrides:RequirementOverrides,caption:string):AttachmentCaptionIssue|null {
  if(!isUserRequired('attachment.caption',overrides)||caption.trim())return null;
  return {id:'attachment.caption',label:'Screenshot caption'};
}
