package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class DashboardController {
    private final RoomService roomService;
    public DashboardController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping(value = "/api/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard(@AuthenticationPrincipal Jwt jwt) {
        DashboardResponse dashboardResponse = roomService.getDashboardByUser(UUID.fromString(jwt.getSubject()));
        return ResponseEntity.ok(dashboardResponse);
    }
}
