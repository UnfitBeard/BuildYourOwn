#include <stdio.h>
#include <stdlib.h>

typedef struct Node
{
    int data;

    struct Node *prev;
    struct Node *next;
} Node;
// function to create a new node
Node *createNode(int new_data)
{
    Node *new_node = (Node *)malloc(sizeof(Node));
    new_node->data = new_data;
    new_node->next = NULL;
    new_node->prev = NULL;
    return new_node;
}

void find(Node *head, int i)
{
    Node *temp = head;
    while (temp != NULL && temp->data != i)
    {
        temp = temp->next;
    }
    if (temp != NULL)
    {
        printf("match found");
    }
    else
    {
        printf("Not found");
    }
}

void insertBefore(Node **head, Node *curr, int i)
{
    if (curr == NULL)
    {
        return;
    }
    Node *new_node = createNode(i);
    new_node->prev = curr->prev;
    new_node->next = curr;
    if (curr->prev != NULL)
    {
        curr->prev->next = new_node;
    }
    else
    {
        *head = new_node;
    }

    curr->prev = new_node;
}

void insertAfter(Node **head, Node *curr, int i)
{
    if (curr == NULL)
    {
        return;
    }
    Node *new_node = createNode(i);
    new_node->prev = curr;
    new_node->next = curr->next;

    if (curr->next != NULL)
    {
        curr->next->prev = new_node;
    }
    curr->next = new_node;
}

void delete(Node **head, Node *curr) {
    if (curr == NULL) {
        return;
    }
    // if curr is the head node
    if (curr->prev == NULL) {
        *head = curr->next;
        if (curr->next != NULL) {
            curr->next->prev = NULL; 
        }
    } else if (curr->next == NULL) {
        curr->prev->next = NULL; 
    } else {
        curr->prev->next = curr->next;
        curr->next->prev = curr->next;
    }
    free(curr);
}

int main()
{

    // Create and Initialize nodes
    Node *head = createNode(10);

    Node *second = createNode(20);
    Node *third = createNode(30);

    // Linking the nodes
    head->next = second;
    second->prev = head;
    second->next = third;
    third->prev = second;

    printf("Doubly Linked List: \n");
    Node *temp = head;
    while (temp)
    {
        printf("%d \n", temp->data);
        temp = temp->next;
    }

    printf("Finding i \n");
    find(head, 10);

    printf("\nInserting before 20 \n");
    insertBefore(&head, second, 15);
    printf("Doubly Linked List after insertion: \n");
    Node *temp1 = head;
    while (temp1)
    {
        printf("%d \n", temp1->data);
        temp1 = temp1->next;
    }

    printf("Insert after 20\n");
    insertAfter(&head, second, 25);
    printf("Doubly Linked List after insertion: \n");
    Node *temp3 = head;
    while (temp3)
    {
        printf("%d \n", temp3->data);
        temp3 = temp3->next;
    }

    printf("Delete 20\n");
    delete(&head, second);
    printf("Doubly Linked List after deletion: \n");
    Node *temp4 = head;
    while (temp4)
    {
        printf("%d \n", temp4->data);
        temp4 = temp4->next;
    }

    return 0;
}