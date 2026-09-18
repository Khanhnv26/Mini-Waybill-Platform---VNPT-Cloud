package org.app.shipmentservice.entity;

public enum CodSettlementStatus {
    UNSETTLED,           // Chưa nộp quỹ bưu cục (bưu tá đang cầm)
    PENDING_SETTLEMENT,  // Chờ bưu cục xác nhận (bưu tá đã gửi nộp)
    SETTLED              // Đã thu quỹ thành công (bưu cục đã xác nhận vào quỹ)
}
