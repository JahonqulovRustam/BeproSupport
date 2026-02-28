package com.bepro.support.module.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity @Getter @Setter
@NoArgsConstructor
public class SystemModule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @OneToMany(mappedBy = "module")
    private List<Lesson> lessons;

    public SystemModule(String title, String description, ArrayList<Lesson> lessons) {
        this.title = title;
        this.description = description;
        this.lessons = lessons;
    }
}
