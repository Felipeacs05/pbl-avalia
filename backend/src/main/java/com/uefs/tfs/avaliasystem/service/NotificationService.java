package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.model.Notification;
import com.uefs.tfs.avaliasystem.model.NotificationType;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final Clock clock;

    public NotificationService(NotificationRepository notificationRepository, Clock clock) {
        this.notificationRepository = notificationRepository;
        this.clock = clock;
    }

    @Transactional
    public Notification notifyStudentLeft(Room room, User student) {
        Notification notification = new Notification();
        notification.setRecipient(room.getTutor());
        notification.setRoom(room);
        notification.setStudent(student);
        notification.setType(NotificationType.STUDENT_LEFT);
        notification.setCreatedAt(clock.instant());
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> listByRecipient(UUID recipientId) {
        return notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(recipientId);
    }
}
