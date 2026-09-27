package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;

import java.util.UUID;

public interface RoomService {
    DashboardResponse getDashboardByUser(UUID userId);
}
