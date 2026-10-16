package org.app.apigateway.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Collections;
import java.util.Enumeration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeaderMapRequestWrapperTest {
    @Test
    void clientHeaderCasingCannotCreateDuplicateForwardedIdentityOrGatewayMarkers() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("x-user-id", "attacker");
        request.addHeader("x-gateway-request", "false");
        HeaderMapRequestWrapper wrapper = new HeaderMapRequestWrapper(request);
        wrapper.addHeader("X-User-Id", "7");
        wrapper.addHeader("X-Gateway-Request", "true");
        var names = Collections.list(wrapper.getHeaderNames());
        assertEquals(1, names.stream().filter("X-User-Id"::equalsIgnoreCase).count());
        assertEquals(1, names.stream().filter("X-Gateway-Request"::equalsIgnoreCase).count());
        assertEquals(java.util.List.of("7"), Collections.list(wrapper.getHeaders("x-user-id")));
        assertEquals("true", wrapper.getHeader("x-gateway-request"));
    }

    @Test
    void blankIdentityHeaderKeepsAnEmptyValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", "spoofed");
        HeaderMapRequestWrapper wrapper = new HeaderMapRequestWrapper(request);
        wrapper.addHeader("X-User-Id", "");

        assertEquals("", wrapper.getHeader("X-User-Id"));
        Enumeration<String> values = wrapper.getHeaders("X-User-Id");
        assertTrue(values.hasMoreElements());
        assertEquals("", values.nextElement());
        assertTrue(Collections.list(wrapper.getHeaderNames()).stream().anyMatch("X-User-Id"::equalsIgnoreCase));
    }
}
