import {describe,expect,it} from 'vitest';
import {attachmentCaptionIssue} from './attachmentCaptionValidation';

describe('Screenshot capture caption policy',()=>{
  it('keeps original optional default and permits uncaptioned screenshot imports',()=>{
    expect(attachmentCaptionIssue({},'')).toBeNull();
    expect(attachmentCaptionIssue({'attachment.caption':false},'')).toBeNull();
  });
  it('requires an actual nonblank caption before a new import only if user opted in',()=>{
    expect(attachmentCaptionIssue({'attachment.caption':true},'  \n ')).toEqual({id:'attachment.caption',label:'Screenshot caption'});
    expect(attachmentCaptionIssue({'attachment.caption':true},'Pre-market GC zone screenshot')).toBeNull();
  });
});
