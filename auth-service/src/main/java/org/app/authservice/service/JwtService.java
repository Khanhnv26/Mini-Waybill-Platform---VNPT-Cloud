package org.app.authservice.service;


import org.app.authservice.entity.User;


public interface JwtService {
    String generateToken(User user);


}
