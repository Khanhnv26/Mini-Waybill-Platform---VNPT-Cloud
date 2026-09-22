package org.app.reportservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomerValidationResponse {

    @JsonProperty("isValid")
    private boolean valid;
    private Long customerId;
}
