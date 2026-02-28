package com.bepro.support.module.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Getter @Setter
@NoArgsConstructor
public class Question {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String text;

    @ElementCollection
    private List<String> options;

    private String correctAns;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    public Question(String text, List<String> options, String correctAns){
        this.text = text;
        this.options = options;
        this.correctAns = correctAns;
    }
}
