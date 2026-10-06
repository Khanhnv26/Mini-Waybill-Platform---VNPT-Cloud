package org.app.shipmentservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.shipmentservice.dto.request.CreateReturnRequestDto;
import org.app.shipmentservice.dto.request.FailureDecisionRequestDto;
import org.app.shipmentservice.dto.request.PostalFaultUpdateRequestDto;
import org.app.shipmentservice.dto.response.DeliveryFailureDecisionResponse;
import org.app.shipmentservice.dto.response.ReturnQuoteResponse;
import org.app.shipmentservice.dto.response.ReturnRequestResponse;
import org.app.shipmentservice.entity.ReturnRequestStatus;
import org.app.shipmentservice.service.ReturnService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    @GetMapping("/{code}/return-quote")
    public ResponseEntity<ReturnQuoteResponse> getReturnQuote(
            @PathVariable("code") String code,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        ReturnQuoteResponse response = returnService.getReturnQuote(code, currentUserId, roles, permissions);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{code}/return-requests")
    public ResponseEntity<ReturnRequestResponse> createReturnRequest(
            @PathVariable("code") String code,
            @Valid @RequestBody CreateReturnRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        ReturnRequestResponse response = returnService.createReturnRequest(code, requestDto, currentUserId, roles, permissions);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{code}/return-request")
    public ResponseEntity<ReturnRequestResponse> getReturnRequest(
            @PathVariable("code") String code,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        ReturnRequestResponse response = returnService.getReturnRequest(code, currentUserId, roles, permissions);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/return-requests")
    public ResponseEntity<List<ReturnRequestResponse>> listReturnRequests(
            @RequestParam(value = "status", required = false) ReturnRequestStatus status,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        List<ReturnRequestResponse> response = returnService.listReturnRequests(status, currentUserId, roles, permissions);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{code}/return-request/postal-fault")
    public ResponseEntity<ReturnRequestResponse> updatePostalFault(
            @PathVariable("code") String code,
            @Valid @RequestBody PostalFaultUpdateRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        ReturnRequestResponse response = returnService.updatePostalFault(code, requestDto, currentUserId, roles, permissions);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending-decisions")
    public ResponseEntity<List<DeliveryFailureDecisionResponse>> getPendingDecisions(
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        List<DeliveryFailureDecisionResponse> response = returnService.getPendingFailureDecisions(currentUserId, roles, permissions);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{code}/failure-decision")
    public ResponseEntity<DeliveryFailureDecisionResponse> submitFailureDecision(
            @PathVariable("code") String code,
            @Valid @RequestBody FailureDecisionRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions
    ) {
        DeliveryFailureDecisionResponse response = returnService.submitFailureDecision(code, requestDto, currentUserId, roles, permissions);
        return ResponseEntity.ok(response);
    }
}
