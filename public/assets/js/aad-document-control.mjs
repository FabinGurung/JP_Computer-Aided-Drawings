/* Provider actions remain authenticated Drive operations, never a browser fiction. */
export function versionId(logicalId,revision){
 if(!/^[A-Z][A-Z0-9-]+$/.test(logicalId)||!Number.isInteger(revision)||revision<1)throw Error('Invalid stable document ID/revision');
 return logicalId+'-R'+String(revision).padStart(6,'0');
}
export function prepareDocumentUpdate(current,{expectedRevision,expectedProviderRevision,contentSha256}){
 if(current.revision!==expectedRevision||current.providerRevision!==expectedProviderRevision)throw Error('Stale document revision; read again before archiving');
 if(!/^[a-f0-9]{64}$/.test(contentSha256))throw Error('Content SHA-256 required');
 return{logicalId:current.logicalId,canonicalProviderId:current.canonicalProviderId,
  archive:{versionId:versionId(current.logicalId,current.revision),readOnly:true,verifyBeforeMutation:true},
  update:{versionId:versionId(current.logicalId,current.revision+1),revision:current.revision+1,requiredProviderRevision:current.providerRevision,contentSha256},
  order:['COPY_CURRENT_TO_ARCHIVE','VERIFY_ARCHIVE_CONTENT_AND_ID','UPDATE_SAME_CURRENT_DOCUMENT','READ_BACK_AND_RECORD_RECEIPT']};
}
export function validateDocumentReceipt(before,after,receipt){
 if(before.logicalId!==after.logicalId||before.canonicalProviderId!==after.canonicalProviderId)throw Error('Canonical identity changed');
 if(after.revision!==before.revision+1)throw Error('Revision must increase by one');
 if(receipt.archiveVersionId!==versionId(before.logicalId,before.revision)||!receipt.archiveVerified||receipt.archiveProviderId===after.canonicalProviderId)throw Error('Verified separate archive required');
 if(receipt.beforeContentSha256!==before.contentSha256||receipt.afterContentSha256!==after.contentSha256||!receipt.currentReadbackVerified)throw Error('Content receipt does not match native readback');
 return true;
}
