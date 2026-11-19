package com.uefs.tfs.avaliasystem.model;

import java.time.Instant;

public interface SingleUsageTokenInterface {
    SingleUsageToken getToken();

    default boolean isValid() {
        return getToken().isValid();
    }

    default boolean isUsed() {
        return getToken().isUsed();
    }

    default void setUsed(boolean used) {
        getToken().setUsed(used);
    }

    default Instant getExpiryDate() {
        return getToken().getExpiryDate();
    }

    default Instant getCreationDate(){
        return getToken().getCreatedAt();
    }
}
