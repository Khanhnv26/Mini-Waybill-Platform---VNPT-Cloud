package org.app.shipmentservice.service;

import org.app.shipmentservice.dto.request.CreateReturnRequestDto;
import org.app.shipmentservice.dto.request.FailureDecisionRequestDto;
import org.app.shipmentservice.dto.request.PostalFaultUpdateRequestDto;
import org.app.shipmentservice.dto.response.DeliveryFailureDecisionResponse;
import org.app.shipmentservice.dto.response.ReturnQuoteResponse;
import org.app.shipmentservice.dto.response.ReturnRequestResponse;
import org.app.shipmentservice.entity.ReturnRequestStatus;

import java.util.List;

public interface ReturnService {

    ReturnQuoteResponse getReturnQuote(String trackingCode, String currentUserId, String roles, String permissions);

    ReturnRequestResponse createReturnRequest(String trackingCode, CreateReturnRequestDto requestDto,
                                              String currentUserId, String roles, String permissions);

    ReturnRequestResponse getReturnRequest(String trackingCode, String currentUserId, String roles, String permissions);

    List<ReturnRequestResponse> listReturnRequests(ReturnRequestStatus status, String currentUserId, String roles, String permissions);

    ReturnRequestResponse updatePostalFault(String trackingCode, PostalFaultUpdateRequestDto requestDto,
                                            String currentUserId, String roles, String permissions);

    List<DeliveryFailureDecisionResponse> getPendingFailureDecisions(String currentUserId, String roles, String permissions);

    DeliveryFailureDecisionResponse submitFailureDecision(String trackingCode, FailureDecisionRequestDto requestDto,
                                                          String currentUserId, String roles, String permissions);
}
