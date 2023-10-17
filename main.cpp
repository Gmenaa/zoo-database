#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <iomanip>
using namespace std;

struct Node {
    int data;
    Node* next;
    Node* prev;
};

void printList(Node* head, ofstream& outfile) {
    Node* cur = head;
    outfile << "[";
    while (cur != NULL ) {
        outfile << cur->data;
        if (cur->next != NULL) {
            outfile << ", ";
        }
        cur = cur->next;
    }
    outfile << "]" << endl;
}

void selectionSort(Node* head, ofstream& outfile) {
    Node* cur = head;
    while (cur != NULL) {
        Node* minNode = cur;
        Node* ptr = cur->next;
        while (ptr != NULL) {
            if (ptr->data < minNode->data) {
                minNode = ptr;
            }
            ptr = ptr->next;
        }
        if (minNode != cur) {
          if(cur->prev != NULL){
            cur->prev->next = minNode;
          }
          else {
            head = minNode;
          }
          minNode->prev->next = cur;
          Node* temp = cur->prev;
          cur->prev = minNode->prev;
          minNode->prev = temp;
          temp = cur->next;
          cur->next = minNode->next;
          minNode->next = temp;  
        }
        cur = cur->next;
        printList(head, outfile);
    }
}

void insertionSort(Node* head, ofstream& outfile) {
    Node* cur = head->next;
    while (cur != NULL) {
        int value = cur->data;
        Node* ptr = cur->prev;
        while (ptr != NULL && ptr->data > value) {
            ptr->next->data = ptr->data;
            ptr = ptr->prev;
        }
        if (ptr == NULL) {
            head->data = value;
            cur->data = value;
        } else {
            ptr->next->data = value;
            cur->data = value;
        }
        printList(head, outfile);
        cur = cur->next;
    }
}


void bubbleSort(Node* head, ofstream& outfile) {
    bool swapped = true;
    while (swapped) {
        swapped = false;
        Node* cur = head;
        Node* prev = NULL;
        while (cur != NULL && cur->next != NULL) {
            if (cur->data > cur->next->data) {
                if (prev != NULL) {
                    prev->next = cur->next;
                } else {
                    head = cur->next;
                }
                Node* next = cur->next;
                cur->next = next->next;
                next->next = cur;
                prev = next;
                swapped = true;
            } else {
                prev = cur;
                cur = cur->next;
            }
        }
        printList(head, outfile);
    }
}


int main(int argc, char *argv[]){
  //get input from file(s)
  ifstream infile("input1.txt");
  string inputline1, inputline2;
  getline(infile, inputline1);
  getline(infile, inputline2);

  /*
  ifstream infile("input2.txt");
  getline(infile, inputline1);
  getline(infile, inputline2);

  ifstream infile("input3.txt");
  getline(infile, inputline1);
  getline(infile, inputline2);
  */

  Node* head = NULL;
  Node* tail =NULL;
  int num;
  istringstream ss(inputline1);
  while (ss >> num) {
      Node* newList = new Node;
      newList->data = num;
      newList->next = NULL;
      newList->prev = tail;
      if (tail == NULL) {
          head = newList;
          tail = newList;
      } else {
          tail->next = newList;
          tail = newList;
      }
  }

  ofstream outfile("output1.txt");
  if (inputline2 == "Selection") {
      selectionSort(head, outfile);
      printList(head, outfile);
  } 
  else if (inputline2 == "Insertion") {
      insertionSort(head, outfile);
      printList(head, outfile);
  } 
  else if (inputline2 == "Bubble") {
      bubbleSort(head, outfile);
      printList(head, outfile);
  } 
  else {
      outfile << "Input is invalid." << endl;
      
  }
  outfile.close();
  return 0;
}

