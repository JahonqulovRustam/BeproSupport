package com.bepro.support.module.dto.request;

import com.bepro.support.module.model.Media;
import com.bepro.support.module.model.Question;
import com.bepro.support.module.model.SystemModule;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class LessonRequest {
    @Schema(description = "Dars nomi", example = "101 Tizimida ekipaj yaratish")
    private String title;

    @Schema(description = "Dars tavsiloti", example = "Ekipaj yaratish va unga xodim birikitirish")
    private String description;

    @Schema(description = "Darsga doir savollar")
    private List<QuestionRequest> questions;

    @Schema(description = "Qaysi modulga tegishli", example = "1")
    private Long moduleId;

    // internal files uploaded
    @Schema(description = "Yuklanadigan media", example = "video.mp4")
    private List<MultipartFile> internalFiles; // for videos/images

    // external media URLs
    @Schema(description = "Online media", example = "youtube.com//video.html")
    private List<ExternalMediaRequest> externalMedia; // optional

}

