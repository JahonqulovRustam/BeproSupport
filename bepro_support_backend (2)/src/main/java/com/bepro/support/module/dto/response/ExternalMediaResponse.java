package com.bepro.support.module.dto.response;

import com.bepro.support.module.model.MediaType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExternalMediaResponse {
    private Long id;
    private String url; // external URL
    private MediaType type;
}
