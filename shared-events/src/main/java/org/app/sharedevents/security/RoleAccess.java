package org.app.sharedevents.security;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public final class RoleAccess {
    private RoleAccess() {}

    public static boolean hasAny(String roles, String... allowed) {
        if (roles == null || roles.isBlank()) return false;
        Set<String> actual = Arrays.stream(roles.split(","))
                .map(String::trim).map(r -> r.startsWith("ROLE_") ? r.substring(5) : r)
                .collect(Collectors.toSet());
        return Arrays.stream(allowed).anyMatch(actual::contains);
    }
}
