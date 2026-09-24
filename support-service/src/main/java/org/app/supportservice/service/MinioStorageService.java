package org.app.supportservice.service;

import org.springframework.web.multipart.MultipartFile;

public interface MinioStorageService {

    String uploadFile(MultipartFile file);

}
