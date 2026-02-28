package com.bepro.support.mapper;

import com.bepro.support.module.dto.request.ExternalMediaRequest;
import com.bepro.support.module.dto.response.ExternalMediaResponse;
import com.bepro.support.module.dto.response.MediaResponse;
import com.bepro.support.module.model.Media;

public class MediaMapper {

    public static MediaResponse toResponse(Media media) {
        return new MediaResponse(
                media.getId(),
                media.getType(),
                media.getExternalUrl() != null
                        ? media.getExternalUrl()
                        : "/api/media/stream/" + media.getId()
        );
    }

    public static Media toEntity(ExternalMediaRequest mediaRequest){
        return new Media(mediaRequest.getExternalUrl(),mediaRequest.getType());
    }
}
