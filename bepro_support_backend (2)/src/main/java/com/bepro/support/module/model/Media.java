package com.bepro.support.module.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "media")
@NoArgsConstructor @Getter @Setter
public class Media {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // INTERNAL
    private String filename;
    private String path;
    private Long size;
    private String contentType;

    // EXTERNAL
    private String externalUrl;

    @Enumerated(EnumType.STRING)
    private MediaType type;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    public Media(String externalUrl, MediaType type){
        this.externalUrl = externalUrl;
        this.type = type;
    }
}
