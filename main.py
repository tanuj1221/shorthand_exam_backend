import tkinter as tk
from tkinter import scrolledtext, ttk, filedialog
import pandas as pd
import pyscreenshot as ImageGrab
import re
from diff_match_patch import diff_match_patch

class TextComparisonApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Text Comparison")
        self.root.state('zoomed')  # Make the window full-screen

        self.df = pd.read_excel('finalpassagesubmit.xlsx', dtype={'student_id': str})
        self.df['student_id'] = self.df['student_id'].astype(str).str.strip()

        self.font_size = 10
        self.create_widgets()

    def create_widgets(self):
        # Search frame
        search_frame = ttk.Frame(self.root)
        search_frame.pack(pady=10)

        ttk.Label(search_frame, text="Student ID:").pack(side=tk.LEFT)
        self.student_id_entry = ttk.Entry(search_frame)
        self.student_id_entry.pack(side=tk.LEFT, padx=5)

        ttk.Button(search_frame, text="Search", command=self.search_student).pack(side=tk.LEFT)

        # Passage buttons
        button_frame = ttk.Frame(self.root)
        button_frame.pack(pady=5)

        ttk.Button(button_frame, text="Passage A", command=lambda: self.show_passage('A')).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Passage B", command=lambda: self.show_passage('B')).pack(side=tk.LEFT, padx=5)

        # Text widgets
        text_frame = ttk.Frame(self.root)
        text_frame.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)

        # Original Text
        original_frame = ttk.Frame(text_frame)
        original_frame.grid(row=0, column=0, sticky="nsew")
        ttk.Label(original_frame, text="Original Text").pack()
        self.original_text = scrolledtext.ScrolledText(original_frame, wrap=tk.WORD, width=40)
        self.original_text.pack(expand=True, fill=tk.BOTH)
        ttk.Button(original_frame, text="Zoom In", command=lambda: self.zoom(self.original_text, 1)).pack(side=tk.LEFT)
        ttk.Button(original_frame, text="Zoom Out", command=lambda: self.zoom(self.original_text, -1)).pack(side=tk.LEFT)

        # Difference Text
        diff_frame = ttk.Frame(text_frame)
        diff_frame.grid(row=0, column=1, sticky="nsew")
        ttk.Label(diff_frame, text="Difference").pack()
        self.diff_text = scrolledtext.ScrolledText(diff_frame, wrap=tk.WORD, width=40)
        self.diff_text.pack(expand=True, fill=tk.BOTH)
        ttk.Button(diff_frame, text="Zoom In", command=lambda: self.zoom(self.diff_text, 1)).pack(side=tk.LEFT)
        ttk.Button(diff_frame, text="Zoom Out", command=lambda: self.zoom(self.diff_text, -1)).pack(side=tk.LEFT)
        ttk.Button(diff_frame, text="Save Image", command=self.save_diff_image).pack(side=tk.LEFT)
        ttk.Button(diff_frame, text="Get Colored Words", command=self.get_colored_words).pack(side=tk.LEFT)

        # Answer Text
        answer_frame = ttk.Frame(text_frame)
        answer_frame.grid(row=0, column=2, sticky="nsew")
        ttk.Label(answer_frame, text="Answer Text").pack()
        self.answer_text = scrolledtext.ScrolledText(answer_frame, wrap=tk.WORD, width=40)
        self.answer_text.pack(expand=True, fill=tk.BOTH)
        ttk.Button(answer_frame, text="Zoom In", command=lambda: self.zoom(self.answer_text, 1)).pack(side=tk.LEFT)
        ttk.Button(answer_frame, text="Zoom Out", command=lambda: self.zoom(self.answer_text, -1)).pack(side=tk.LEFT)

        text_frame.grid_columnconfigure(0, weight=1)
        text_frame.grid_columnconfigure(1, weight=1)
        text_frame.grid_columnconfigure(2, weight=1)
        text_frame.grid_rowconfigure(0, weight=1)

        self.diff_text.tag_configure('equal', foreground='black')
        self.diff_text.tag_configure('added', foreground='green')
        self.diff_text.tag_configure('removed', foreground='red')
        self.diff_text.tag_configure('title', foreground='blue', font=('TkDefaultFont', 12, 'bold'))

        # Mistakes display
        mistakes_frame = ttk.Frame(self.root)
        mistakes_frame.pack(pady=10, fill=tk.BOTH, expand=True)
        self.mistakes_text = scrolledtext.ScrolledText(mistakes_frame, wrap=tk.WORD, width=60, height=10)
        self.mistakes_text.pack(expand=True, fill=tk.BOTH)

    def zoom(self, text_widget, direction):
        self.font_size += direction
        current_font = text_widget.cget("font")
        text_widget.configure(font=(current_font, self.font_size))

    def search_student(self):
        student_id = self.student_id_entry.get().strip()
        mask = (self.df['student_id'] == student_id)
        
        if mask.any():
            self.current_student = self.df[mask].iloc[0]
            self.original_text.delete(1.0, tk.END)
            self.diff_text.delete(1.0, tk.END)
            self.answer_text.delete(1.0, tk.END)
            self.diff_text.insert(tk.END, f"Student ID {student_id} found. Select Passage A or B to compare.")
        else:
            self.original_text.delete(1.0, tk.END)
            self.diff_text.delete(1.0, tk.END)
            self.answer_text.delete(1.0, tk.END)
            self.diff_text.insert(tk.END, f"Student ID {student_id} not found.")

    def show_passage(self, passage):
        if hasattr(self, 'current_student'):
            if passage == 'A':
                original = self.current_student['ansPassageA']
                answer = self.current_student['passageA']
            else:
                original = self.current_student['ansPassageB']
                answer = self.current_student['passageB']

            self.original_text.delete(1.0, tk.END)
            self.original_text.insert(tk.END, original)

            self.answer_text.delete(1.0, tk.END)
            self.answer_text.insert(tk.END, answer)

            self.compare_texts(original, answer)
        else:
            self.diff_text.delete(1.0, tk.END)
            self.diff_text.insert(tk.END, "Please search for a student ID first.")

    def compare_texts(self, text1, text2):
        dmp = diff_match_patch()
        diffs = dmp.diff_main(text1, text2)
        dmp.diff_cleanupSemantic(diffs)

        self.diff_text.delete(1.0, tk.END)
        for op, text in diffs:
            if op == 0:  # Equal
                self.diff_text.insert(tk.END, text, 'equal')
            elif op == 1:  # Inserted
                self.diff_text.insert(tk.END, text, 'added')
            elif op == -1:  # Deleted
                self.diff_text.insert(tk.END, text, 'removed')

    def save_diff_image(self):
        file_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG files", "*.png")])
        if file_path:
            x = self.diff_text.winfo_rootx()
            y = self.diff_text.winfo_rooty()
            width = self.diff_text.winfo_width()
            height = self.diff_text.winfo_height()
            image = ImageGrab.grab(bbox=(x, y, x+width, y+height))
            image.save(file_path)

    def get_colored_words(self):
        missed_words = []
        extra_added = []
        spelling_mistakes = []
        mistakes = []

        content = self.diff_text.get("1.0", tk.END)
        words = re.findall(r'\S+', content)  # Split into words

        for word in words:
            start_index = content.index(word)
            end_index = start_index + len(word)
            tags = set()

            for i in range(start_index, end_index):
                char_index = f"1.0 + {i} chars"
                tags.update(self.diff_text.tag_names(char_index))

            if 'added' in tags and 'removed' not in tags and 'equal' not in tags:
                missed_words.append(word)
            elif 'removed' in tags and 'added' not in tags and 'equal' not in tags:
                extra_added.append(word)
            elif 'removed' in tags and 'added' in tags and 'equal' not in tags:
                mistakes.append(word)
            elif ('added' in tags and 'equal' in tags) or ('removed' in tags and 'equal' in tags) or ('removed' in tags and 'added' in tags and 'equal' in tags):
                spelling_mistakes.append(word)

        result = {
            "Missed Words": missed_words,
            "Extra Added": extra_added,
            "Spelling Mistakes": spelling_mistakes,
            "Other Mistakes": mistakes
        }

        self.display_mistakes(result)

        return result

    def display_mistakes(self, mistakes_dict):
        self.mistakes_text.delete(1.0, tk.END)
        self.mistakes_text.insert(tk.END, "Mistakes Summary:\n\n", 'title')
        
        for category, words in mistakes_dict.items():
            self.mistakes_text.insert(tk.END, f"{category}:\n", 'category')
            if words:
                for word in words:
                    self.mistakes_text.insert(tk.END, f"• {word}\n", 'mistake')
            else:
                self.mistakes_text.insert(tk.END, "None\n", 'none')
            self.mistakes_text.insert(tk.END, "\n")

        # Configure tags for styling
        self.mistakes_text.tag_configure('title', font=('TkDefaultFont', 12, 'bold'))
        self.mistakes_text.tag_configure('category', font=('TkDefaultFont', 10, 'bold'))
        self.mistakes_text.tag_configure('mistake', lmargin1=20, lmargin2=20)
        self.mistakes_text.tag_configure('none', foreground='gray')

root = tk.Tk()
app = TextComparisonApp(root)
root.mainloop()