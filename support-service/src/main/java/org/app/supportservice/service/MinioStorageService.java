package org.app.supportservice.service;

import org.springframework.web.multipart.MultipartFile;

public interface MinioStorageService {

    String uploadFile(MultipartFile file, Long ticketId);
    String signedUrl(String objectKey);
    String normalizeAttachment(String attachment, Long ticketId);

}
