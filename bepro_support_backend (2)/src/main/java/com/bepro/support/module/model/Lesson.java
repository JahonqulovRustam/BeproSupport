package com.bepro.support.module.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "lessons") @NoArgsConstructor @Getter @Setter
public class Lesson {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL)
    private List<Media> media;

    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "module_id")
    private SystemModule module;


    public Lesson(String title, String description, List<Question> questions, SystemModule module, List<Media> medias){
        this.title = title;
        this.description = description;
        this.questions = questions;
        this.module = module;
        this.media = medias;
    }
}
