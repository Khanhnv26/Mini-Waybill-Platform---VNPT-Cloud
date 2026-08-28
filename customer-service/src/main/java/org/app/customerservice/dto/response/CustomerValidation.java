package org.app.customerservice.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.customerservice.entity.Customer;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomerValidation {

    @JsonProperty("isValid")
    private boolean isValid;
    private String reason;
}

