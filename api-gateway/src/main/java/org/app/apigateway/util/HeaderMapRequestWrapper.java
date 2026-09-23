package org.app.apigateway.util;


import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.util.*;

public class HeaderMapRequestWrapper extends HttpServletRequestWrapper {
    private final Map<String, String> customHeaders = new HashMap<>();

    public HeaderMapRequestWrapper(HttpServletRequest request) {
        super(request);
    }

    public void addHeader(String name, String value) {
        customHeaders.put(name,value);
    }

    @Override
    public String getHeader(String name) {
        if (hasCustomHeader(name)) {
            return customHeader(name);
        }
        return super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaderNames() {
        Set<String> set = new HashSet<>(customHeaders.keySet());
        Enumeration<String> e = super.getHeaderNames();
        while(e.hasMoreElements()) {
            set.add(e.nextElement());
        }
        return Collections.enumeration(set);
    }


    @Override
    public Enumeration<String> getHeaders(String name) {
        if (hasCustomHeader(name)) {
            String headerValue = customHeader(name);
            if (headerValue == null || headerValue.isEmpty()) {
                return Collections.emptyEnumeration();
            }
            return Collections.enumeration(Collections.singletonList(headerValue));
        }
        return super.getHeaders(name);
    }

    private boolean hasCustomHeader(String name) {
        if (name == null) {
            return false;
        }
        if (customHeaders.containsKey(name)) {
            return true;
        }
        for (String key : customHeaders.keySet()) {
            if (key.equalsIgnoreCase(name)) {
                return true;
            }
        }
        return false;
    }

    private String customHeader(String name) {
        if (customHeaders.containsKey(name)) {
            return customHeaders.get(name);
        }
        for (Map.Entry<String, String> entry : customHeaders.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(name)) {
                return entry.getValue();
            }
        }
        return null;
    }

}
